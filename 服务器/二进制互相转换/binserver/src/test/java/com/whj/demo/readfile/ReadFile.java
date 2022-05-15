package com.whj.demo.readfile;

import org.junit.jupiter.api.Test;

import java.io.*;
import java.util.Arrays;

public class ReadFile {
    //拼凑文件的时候，该常量要与分割文件的时候保持一致
    private static final int SIZE_PER_PAGE = 1024*100; //每个txt的字符数
    /**
     * 测试函数
     */
    @Test
    public void test(){
        //分割文件
//        splitFiles("/Users/pc/Desktop/111.jpg","/Users/pc/Desktop/whj/");

        //还原文件
        //执行之前，请记得修改SIZE_PER_PAGE
        //执行之前，请记得修改 82841600
        reviewFile("/Users/pc/Desktop/whj/","/Users/pc/Desktop/222.zip","82841600");
    }


    /**
     * 还原文件
     * @param targetTxttZoneUrl  all.txt的文件夹路径
     * @param fileUrl            最终还原好了的文件的路径
     */
    @Test
    public void reviewFile(String targetTxttZoneUrl,String fileUrl,String lastTxtFileName){
        try {
            //先拼凑文件
            FileTogether(targetTxttZoneUrl, lastTxtFileName);
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
        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    /**
     * 拼凑文件
     * @param targetTxttZoneUrl  all.txt的文件夹路径
     * @param lastTxtFileName    最后一个文件的文件名，不带.txt
     */
    @Test
    public void FileTogether(String targetTxttZoneUrl,String lastTxtFileName){
        int lastNum = Integer.parseInt(lastTxtFileName);
        try {
            BufferedWriter bw=new BufferedWriter(new FileWriter(targetTxttZoneUrl+"all.txt"));
            for (int i = 0; i <= lastNum; i+=SIZE_PER_PAGE) {
                String FileName=targetTxttZoneUrl+i+".txt";
                File file=new File(FileName);
                if(file.exists()) {
//                    System.out.println(FileName);
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


    /**
     * 分割文件
     * @param targetUrl    文件路径
     * @param finalZoneUrl txt碎片文件夹路径
     */
    @Test
    public void splitFiles(String targetUrl,String finalZoneUrl){
        try {
            RandomAccessFile src = new RandomAccessFile(targetUrl, "r");
            byte[] bytes = new byte[(int)src.length()];
            src.read(bytes);
            String str = Arrays.toString(bytes).replaceAll(" ","").replace("[","").replace("]","");;
            src.close();

            int len = str.length();
            System.out.println(len);
            int last = 0;
            for(int i=0;i<str.length()-SIZE_PER_PAGE;i+=SIZE_PER_PAGE){
                RandomAccessFile raf = new RandomAccessFile(finalZoneUrl+i+".txt", "rw");
                String s = str.substring(i,i+SIZE_PER_PAGE);

//                System.out.println(i+": "+s);
                last = i+SIZE_PER_PAGE;
                raf.write(s.getBytes("utf-8"));
                raf.close();
            }
            RandomAccessFile raf = new RandomAccessFile(finalZoneUrl+last+".txt", "rw");
            String s = str.substring(last);
            raf.write(s.getBytes("utf-8"));
//            System.out.println("last: "+str.substring(last));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
