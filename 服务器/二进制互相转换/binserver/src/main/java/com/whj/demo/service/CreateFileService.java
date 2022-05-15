package com.whj.demo.service;

import org.springframework.stereotype.Service;

import java.io.*;

@Service
public class CreateFileService {
    /**
     * 还原文件
     * @param targetTxttZoneUrl  all.txt的文件夹路径
     * @param fileUrl            最终还原好了的文件的路径
     * @param lastTxtFileName    最后一个文件的文件名，不带.txt
     * @param sizePerPage        每个txt文件中的字符数
     */
    public String createFile(String targetTxttZoneUrl,String fileUrl,String lastTxtFileName,Integer sizePerPage){
        try {
            //先拼凑文件
            FileTogether(targetTxttZoneUrl, lastTxtFileName,sizePerPage);
            //以下是还原文件
            RandomAccessFile src = new RandomAccessFile(targetTxttZoneUrl+"all.txt", "r");
            byte[] data = new byte[(int)src.length()];
            src.read(data);
            String str = new String(data, "utf-8").replaceAll("\\s*","");
            String[] a = str.split(",");

            byte[] b = new byte[a.length];
            for(int i=0;i<b.length;i++){
                b[i] = (byte)Integer.parseInt(a[i]);
            }

//            System.out.println(Arrays.toString(b));

            RandomAccessFile desc = new RandomAccessFile(fileUrl, "rw");
            desc.write(b, 0, b.length);
            src.close();
            desc.close();
            return "OK!!!";
        } catch (Exception e) {
            e.printStackTrace();
            return "WRONG!!!";
        }
    }

    /**
     * 拼凑文件
     * @param targetTxttZoneUrl  all.txt的文件夹路径
     * @param lastTxtFileName    最后一个文件的文件名，不带.txt
     */
    private void FileTogether(String targetTxttZoneUrl,String lastTxtFileName,Integer sizePerPage){
        System.out.println("------>"+targetTxttZoneUrl);
        int lastNum = Integer.parseInt(lastTxtFileName);
        try {
            BufferedWriter bw=new BufferedWriter(new FileWriter(targetTxttZoneUrl+"all.txt"));
            for (int i = 0; i <= lastNum; i+=sizePerPage) {
                String FileName=targetTxttZoneUrl+i+".txt";
//                System.out.println(FileName);
                File file=new File(FileName);
                if(file.exists()) {
                    BufferedReader br = new BufferedReader(new FileReader(file));
                    String line;
                    while((line=br.readLine())!=null) {
                        bw.write(line);
                        bw.newLine();
                    }
                    br.close();
                }
            }
            bw.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
