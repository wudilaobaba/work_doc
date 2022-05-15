package com.whj.demo.service;

import org.springframework.stereotype.Service;

import java.io.RandomAccessFile;
import java.util.Arrays;

@Service
public class SlipFileService {
    /**
     * 分割文件
     * @param targetUrl    文件路径
     * @param finalZoneUrl txt碎片文件夹路径
     * @param sizePerPage 每个txt文件中的字符数
     */
    public String SplitFiles(String targetUrl,String finalZoneUrl,int sizePerPage){
        try {
            RandomAccessFile src = new RandomAccessFile(targetUrl, "r");
            byte[] bytes = new byte[(int)src.length()];
            src.read(bytes);
            String str = Arrays.toString(bytes).replaceAll(" ","").replace("[","").replace("]","");;
            src.close();

            int len = str.length();
            System.out.println(len);
            int last = 0;
            for(int i=0;i<str.length()-sizePerPage;i+=sizePerPage){
                RandomAccessFile raf = new RandomAccessFile(finalZoneUrl+i+".txt", "rw");
                String s = str.substring(i,i+sizePerPage);

                System.out.println(i+": "+s);
                last = i+sizePerPage;
                raf.write(s.getBytes("utf-8"));
                raf.close();
            }
            RandomAccessFile raf = new RandomAccessFile(finalZoneUrl+last+".txt", "rw");
            String s = str.substring(last);
            raf.write(s.getBytes("utf-8"));
//            System.out.println("last: "+str.substring(last));
            System.out.println(finalZoneUrl+last+".txt");
            raf.close();
            return "OK!!!";
        } catch (Exception e) {
            e.printStackTrace();
            return "Wrong!!!";
        }
    }
}
